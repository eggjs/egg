import path from 'node:path';
import assert from 'node:assert';
import { GeneratorResult } from '../../dist/';
import * as utils from '../../dist/utils';
import { triggerGenerator } from './utils';
import { mm } from '@eggjs/mock';

describe('test/generators/plugin.test.ts', () => {
  const appDir = path.resolve(__dirname, '../fixtures/real-unittest');

  afterEach(mm.restore);

  it('should works without error', () => {
    const result = triggerGenerator<GeneratorResult>('plugin', path.resolve(__dirname, appDir));
    // console.log(result);
    assert(result.dist);
    assert(result.content!.includes('import \'@eggjs/view\''));
    assert(!result.content!.includes('import \'@eggjs/static\''));
    assert(result.content!.includes('static?: EggPluginItem'));
    assert(result.content!.includes('view?: EggPluginItem'));
  });

  it('should remove file if eggInfo.plugins is undefined', () => {
    mm(utils, 'getEggInfo', options => (options && options.callback ? options.callback({}) : {}));
    const result = triggerGenerator<GeneratorResult>('plugin', path.resolve(__dirname, appDir));
    assert(result.dist);
    assert(!result.content);
  });

  it('should remove file if eggInfo.plugins is empty object', () => {
    mm(utils, 'getEggInfo', options => (options && options.callback ? options.callback({}) : {}));
    const result = triggerGenerator<GeneratorResult>('plugin', path.resolve(__dirname, appDir));
    assert(result.dist);
    assert(!result.content);
  });

  it('should format plugin name', () => {
    const mockData = { plugins: { 'kiss-ass': { package: 'kiss-ass', enable: true, from: 'kiss-ass' } } };
    mm(utils, 'getEggInfo', options => (options && options.callback ? options.callback(mockData) : mockData));
    const result = triggerGenerator<GeneratorResult>('plugin', path.resolve(__dirname, appDir));
    assert(result.dist);
    assert(result.content!.includes('\'kiss-ass\'?: EggPluginItem'));
  });

  it('should support useAbsolutePackagePath without error', async () => {
    const result = triggerGenerator<GeneratorResult>('plugin', path.resolve(__dirname, appDir), undefined, {
      usePath: true,
    });

    assert(result.dist);
    assert(result.content);
    if (path.sep === '/') {
      assert(result.content!.match(/import '\/([\w.-]+\/)+node_modules\//));
    }
  });
});
