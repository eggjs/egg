import { strict as assert } from 'node:assert';
import path from 'node:path';
import mm from '../src/index.js';
import { formatOptions } from '../src/lib/format_options.js';
import { getSourceDirname } from '../src/lib/utils.js';
import { getFixtures } from './helper.js';

describe('test/format_options.test.ts', () => {
  afterEach(mm.restore);

  it('should return the default options', () => {
    const options = formatOptions();
    assert(options);
    assert(options.coverage === true);
    assert(options.cache === true);
    assert(options.baseDir === process.cwd());
    assert.deepEqual(options.plugins['egg-mock'], {
      enable: true,
      path: path.join(getSourceDirname(), '..'),
    });
  });

  it('should return baseDir when on windows', () => {
    const baseDir = 'D:\\projectWorkSpace\\summer';
    mm(path, 'isAbsolute', path.win32.isAbsolute);
    mm(process, 'cwd', () => baseDir);
    try {
      formatOptions();
      throw new Error('should not run');
    } catch (err: any) {
      assert(/D:[\\|\/]projectWorkSpace[\\|\/]summer/.test(err.message));
    }
  });

  it('should set cache', () => {
    const options = formatOptions({ cache: false });
    assert(options);
    assert(options.cache === false);
  });

  it('should disable cache when call mm.env', () => {
    mm.env('prod');
    const options = formatOptions();
    assert(options);
    assert(options.cache === false);
  });

  it('should set coverage', () => {
    const options = formatOptions({ coverage: false });
    assert(options);
    assert(options.coverage === false);
  });

  it('should return options when set full baseDir', () => {
    const baseDir = getFixtures('app');
    const options = formatOptions({ baseDir });
    assert(options);
    assert(options.baseDir === baseDir);
  });

  it('should return options when set short baseDir', () => {
    const options = formatOptions({ baseDir: 'apps/foo' });
    assert(options);
    assert(options.baseDir === getFixtures('apps/foo'));
  });

  it('should return options when set customEgg', () => {
    const customEgg = getFixtures('bar');
    const options = formatOptions({ customEgg });
    assert(options);
    assert(options.customEgg === customEgg);
    assert(options.framework === customEgg);
  });

  it('should return options when set customEgg=true', () => {
    const baseDir = getFixtures('bar');
    mm(process, 'cwd', () => {
      return baseDir;
    });
    const options = formatOptions({ customEgg: true });
    assert(options);
    assert.equal(options.framework, baseDir);
    assert.equal(options.customEgg, baseDir);
  });

  it('should return options when set framework=true', () => {
    const baseDir = getFixtures('bar');
    mm(process, 'cwd', () => {
      return baseDir;
    });
    const options = formatOptions({ framework: true });
    assert(options);
    assert.equal(options.framework, baseDir);
    assert.equal(options.customEgg, baseDir);
  });

  it('should push plugins when in plugin dir', () => {
    const baseDir = getFixtures('plugin');
    mm(process, 'cwd', () => {
      return baseDir;
    });
    const options = formatOptions();
    assert(options);
    assert.deepEqual(options.plugins.plugin1, {
      enable: true,
      path: baseDir,
    });
  });

  it('should not push plugins when in plugin dir but options.plugin = false', () => {
    const baseDir = getFixtures('plugin');
    mm(process, 'cwd', () => {
      return baseDir;
    });
    const options = formatOptions({
      plugin: false,
    });
    assert(options);
    assert(!options.plugins.plugin1);
  });

  it('should not throw when no eggPlugin', () => {
    const baseDir = getFixtures('plugin_throw');
    mm(process, 'cwd', () => {
      return baseDir;
    });
    formatOptions();
  });

  it('should throw when no eggPlugin and options.plugin === true', () => {
    const baseDir = getFixtures('plugin_throw');
    mm(process, 'cwd', () => {
      return baseDir;
    });
    assert.throws(() => {
      formatOptions({
        plugin: true,
      });
    }, new RegExp(`should set "eggPlugin" property in ${baseDir}/package.json`));
  });

  it('should mock process.env.HOME when EGG_SERVER_ENV is default, test, prod', () => {
    const baseDir = process.cwd();

    mm(process.env, 'EGG_SERVER_ENV', 'local');
    assert.notEqual(process.env.HOME, baseDir);

    mm(process.env, 'EGG_SERVER_ENV', 'default');
    formatOptions();
    assert.equal(process.env.HOME, baseDir);

    mm(process.env, 'EGG_SERVER_ENV', 'test');
    formatOptions();
    assert.equal(process.env.HOME, baseDir);

    mm(process.env, 'EGG_SERVER_ENV', 'prod');
    formatOptions();
    assert.equal(process.env.HOME, baseDir);
  });

  it('should not mock process.env.HOME when it has mocked', () => {
    const baseDir = process.cwd();
    mm(process.env, 'HOME', '/mockpath');
    mm(process.env, 'EGG_SERVER_ENV', 'default');
    formatOptions();
    assert.notEqual(process.env.HOME, baseDir);
  });
});
