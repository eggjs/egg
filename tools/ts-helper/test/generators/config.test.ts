import path from 'node:path';
import assert from 'node:assert';
import { GeneratorResult } from '../../dist/';
import * as utils from '../../dist/utils';
import { triggerGenerator } from './utils';
import { mm } from '@eggjs/mock';

describe('generators/config.test.ts', () => {
  const appDir = path.resolve(__dirname, '../fixtures/app');
  const commonConfig = {
    pattern: 'config.*.(ts|js)',
  };

  it('should works without error', () => {
    const result = triggerGenerator<GeneratorResult>('config', appDir);
    assert(result.content);
    assert(result.content!.includes("import ExportConfigDefault from '../../config/config.default.js';"));
    assert(result.content!.includes('type ConfigDefault = ReturnType<typeof ExportConfigDefault>;'));
    assert(result.content!.includes('type NewEggAppConfig = ConfigDefault;'));
    assert(result.content!.includes("declare module 'larva'"));
    assert(result.content!.includes('interface EggAppConfig extends NewEggAppConfig { }\n'));
  });

  it('should works without error with *.ts', () => {
    mm(utils, 'loadTsConfig', () => ({ skipLibCheck: true }));
    const result = triggerGenerator<GeneratorResult>('config', appDir, undefined, commonConfig);
    assert(result.content);
    assert(result.content!.includes("import ExportConfigDefault from '../../config/config.default.js';"));
    assert(result.content!.includes("import ExportConfigLocal from '../../config/config.local.js';"));
    assert(result.content!.includes("import * as ExportConfigProd from '../../config/config.prod.js';"));
    assert(result.content!.includes('type ConfigDefault = ReturnType<typeof ExportConfigDefault>;'));
    assert(result.content!.includes('type ConfigLocal = typeof ExportConfigLocal;'));
    assert(result.content!.includes('type ConfigProd = typeof ExportConfigProd;'));
    assert(result.content!.includes('ConfigDefault & ConfigLocal & ConfigProd;'));
    assert(result.content!.includes("declare module 'larva'"));
    assert(result.content!.includes('interface EggAppConfig extends NewEggAppConfig { }\n'));
  });

  it('should not generate d.ts with export plain object', () => {
    const result = triggerGenerator<GeneratorResult>('config', appDir, undefined, commonConfig);
    assert(result.content);
    assert(result.content!.includes("import ExportConfigDefault from '../../config/config.default.js';"));
    assert(!result.content!.includes("import ExportConfigLocal from '../../config/config.local.js';"));
  });

  it('should works without error with file changed', () => {
    mm(utils, 'loadTsConfig', () => ({ skipLibCheck: true }));
    triggerGenerator<GeneratorResult>('config', appDir, undefined, commonConfig);
    const result = triggerGenerator<GeneratorResult>('config', appDir, 'config.default', commonConfig);
    assert(result.content);
    assert(result.content!.includes("import ExportConfigDefault from '../../config/config.default.js';"));
    assert(result.content!.includes("import ExportConfigLocal from '../../config/config.local.js';"));
    assert(result.content!.includes("import * as ExportConfigProd from '../../config/config.prod.js';"));
    assert(result.content!.includes('type ConfigDefault = ReturnType<typeof ExportConfigDefault>;'));
    assert(result.content!.includes('type ConfigLocal = typeof ExportConfigLocal;'));
    assert(result.content!.includes('type ConfigProd = typeof ExportConfigProd;'));
    assert(result.content!.includes('ConfigDefault & ConfigLocal & ConfigProd;'));
    assert(result.content!.includes("declare module 'larva'"));
    assert(result.content!.includes('interface EggAppConfig extends NewEggAppConfig { }'));
  });

  it('should works while file was not exist', () => {
    mm(utils, 'loadTsConfig', () => ({ skipLibCheck: true }));
    triggerGenerator<GeneratorResult>('config', appDir, undefined, commonConfig);
    const result = triggerGenerator<GeneratorResult>('config', appDir, 'config.xxx', commonConfig);
    assert(!result.content!.includes("config.xxx';"));
    assert(result.content!.includes("import ExportConfigDefault from '../../config/config.default.js';"));
    assert(result.content!.includes("import ExportConfigLocal from '../../config/config.local.js';"));
  });

  it('should works while only has config.ts', () => {
    mm(utils, 'loadTsConfig', () => ({ skipLibCheck: true }));
    const result = triggerGenerator<GeneratorResult>('config', path.resolve(__dirname, '../fixtures/app2'));
    assert(result.content);
    assert(result.content!.includes("import ExportConfig from '../../config/config.js';"));
    assert(result.content!.includes('type Config = ReturnType<typeof ExportConfig>;'));
    assert(result.content!.includes('Config'));
  });

  it('should works with js project anyway', () => {
    const result = triggerGenerator<GeneratorResult>('config', path.resolve(__dirname, '../fixtures/real-js'), undefined, commonConfig);
    assert(result.content);
    assert(result.content!.includes("import ExportConfigDefault = require('../../config/config.default');"));
    assert(result.content!.includes("import ExportConfigLocal = require('../../config/config.local');"));
    assert(result.content!.includes('type ConfigDefault = typeof ExportConfigDefault;'));
    assert(result.content!.includes('type ConfigLocal = ReturnType<typeof ExportConfigLocal>;'));
  });

  it('should works without error with empty config.ts', () => {
    mm(utils, 'loadTsConfig', () => ({ skipLibCheck: true }));
    const result = triggerGenerator<GeneratorResult>('config', path.resolve(__dirname, '../fixtures/app4'));
    assert(!result.content);
  });
});
