import { describe, it, expect } from 'vitest';

import { defineConfig, type EggAppInfo, type PartialEggConfig } from '../../src/index.ts';

describe('test/lib/define_config.test.ts', () => {
  describe('defineConfig', () => {
    it('should work with config object', () => {
      const config = defineConfig({
        keys: 'my-keys',
        middleware: ['cors'],
        logger: {
          level: 'DEBUG',
          consoleLevel: 'DEBUG',
          disableConsoleAfterReady: true,
        },
        customLogger: {
          myLogger: {
            file: 'my.log',
          },
        },
        dump: {
          ignore: new Set(['keys']),
          timing: {
            slowBootActionMinDuration: 1000,
          },
        },
        appCustomConfig: {
          myConfig: 'myConfig',
        },
      });

      expect(config).matchSnapshot();
      expect(config.appCustomConfig.myConfig).toBe('myConfig');
    });

    it('should work with config function', () => {
      const configFactory = defineConfig(appInfo => ({
        keys: appInfo.name + '_keys',
        middleware: [],
        env: appInfo.env,
        logger: {
          level: 'DEBUG',
          consoleLevel: 'WARN',
        },
        appCustomConfig: {
          myConfig: 'myConfig',
        },
      }));

      expect(configFactory).toBeInstanceOf(Function);

      const mockAppInfo = {
        name: 'testapp',
        baseDir: '/tmp/testapp',
        env: 'unittest',
        HOME: '/home/test',
        pkg: { name: 'testapp', version: '1.0.0' },
        root: '/tmp',
      } as unknown as EggAppInfo;

      const result = configFactory(mockAppInfo);
      expect(result).matchSnapshot();
    });

    it('should work with mixed config and bizConfig', () => {
      const configFactory = defineConfig((appInfo: EggAppInfo) => {
        const config: PartialEggConfig = {
          keys: appInfo.name + '_keys',
          middleware: [] as string[],
          logger: {
            level: 'DEBUG',
            consoleLevel: 'INFO',
            disableConsoleAfterReady: true,
          },
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

      expect(configFactory).toBeInstanceOf(Function);

      const mockAppInfo = {
        name: 'myapp',
        baseDir: '/tmp/myapp',
        env: 'local',
        HOME: '/home/test',
        pkg: { name: 'myapp', version: '1.0.0' },
        root: '/tmp',
      } as unknown as EggAppInfo;

      const result = configFactory(mockAppInfo);
      expect(result).matchSnapshot();
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

      expect(config).matchSnapshot();
    });
  });
});
