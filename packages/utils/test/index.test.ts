import { strict as assert } from 'node:assert';
import { describe, it, expect } from 'vitest';

import { detectType, EggType } from '../src/index.ts';
import * as all from '../src/index.ts';
import { getFilepath } from './helper.ts';

describe('test/index.test.ts', () => {
  describe('detectType()', () => {
    it('should detect application', async () => {
      const baseDir = getFilepath('egg-app');
      assert.equal(await detectType(baseDir), EggType.application);
      assert.equal(await detectType(baseDir), 'application');
    });

    it('should detect plugin', async () => {
      const baseDir = getFilepath('egg-app/plugin/p');
      assert.equal(await detectType(baseDir), EggType.plugin);
      assert.equal(await detectType(baseDir), 'plugin');
    });

    it('should detect framework', async () => {
      const baseDir = getFilepath('framework-egg-default/node_modules/egg');
      assert.equal(await detectType(baseDir), EggType.framework);
      assert.equal(await detectType(baseDir), 'framework');
    });

    it('should detect unknown', async () => {
      const baseDir = getFilepath('no-package-json');
      assert.equal(await detectType(baseDir), EggType.unknown);
      assert.equal(await detectType(baseDir), 'unknown');
    });
  });

  describe('export all', () => {
    it('should keep checking', () => {
      expect(Object.keys(all).sort()).toMatchSnapshot();
    });
  });
});
