import { describe, it } from 'vitest';
import assert from 'node:assert';
import { defineConfig, type EggAppInfo } from '../../src/index.ts';

describe('test/lib/define_config.test.ts', () => {
  describe('defineConfig', () => {
    it('should work with config object', () => {
      const config = defineConfig({
        keys: 'my-keys',
        middleware: ['cors'],
        logger: {
          level: 'INFO',
        },
      });

      assert.deepStrictEqual(config, {
        keys: 'my-keys',
        middleware: ['cors'],
        logger: {
          level: 'INFO',
        },
      });
    });

    it('should work with config function', () => {
      const configFactory = defineConfig((appInfo: EggAppInfo) => ({
        keys: appInfo.name + '_keys',
        middleware: [],
        env: appInfo.env,
      }));

      assert.equal(typeof configFactory, 'function');

      const mockAppInfo: EggAppInfo = {
        name: 'testapp',
        baseDir: '/tmp/testapp',
        env: 'unittest',
        HOME: '/home/test',
        pkg: { name: 'testapp', version: '1.0.0' },
        root: '/tmp',
      };

      const result = configFactory(mockAppInfo);
      assert.deepStrictEqual(result, {
        keys: 'testapp_keys',
        middleware: [],
        env: 'unittest',
      });
    });

    it('should work with mixed config and bizConfig', () => {
      const configFactory = defineConfig((appInfo: EggAppInfo) => {
        const config = {
          keys: appInfo.name + '_keys',
          middleware: [] as string[],
        };

        const bizConfig = {
          sourceUrl: `https://example.com/${appInfo.name}`,
          customSetting: true,
        };

        return {
          ...config,
          ...bizConfig,
        };
      });

      assert.equal(typeof configFactory, 'function');

      const mockAppInfo: EggAppInfo = {
        name: 'myapp',
        baseDir: '/tmp/myapp',
        env: 'local',
        HOME: '/home/test',
        pkg: { name: 'myapp', version: '1.0.0' },
        root: '/tmp',
      };

      const result = configFactory(mockAppInfo);
      assert.deepStrictEqual(result, {
        keys: 'myapp_keys',
        middleware: [],
        sourceUrl: 'https://example.com/myapp',
        customSetting: true,
      });
    });

    it('should preserve type safety for built-in config options', () => {
      // This test ensures TypeScript compilation works correctly with defineConfig
      const config = defineConfig({
        keys: 'test-key',
        middleware: ['cors', 'bodyParser'],
        logger: {
          level: 'DEBUG',
          consoleLevel: 'INFO',
        },
        httpclient: {
          timeout: 5000,
        },
      });

      assert.equal(config.keys, 'test-key');
      assert.deepStrictEqual(config.middleware, ['cors', 'bodyParser']);
      assert.equal(config.logger?.level, 'DEBUG');
      assert.equal(config.httpclient?.timeout, 5000);
    });
  });
});