import path from 'node:path';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { restore, mm } from 'mm';
import { getFrameworkPath } from '../src/index.js';
import { getFilepath, testDir } from './helper.js';

describe('test/framework.test.ts', () => {
  afterEach(restore);

  it('should exist when specify baseDir', () => {
    it('should get egg by default but not exist', () => {
      const baseDir = getFilepath('noexist');
      assert.throws(() => {
        getFrameworkPath({
          baseDir,
        });
      }, (err: Error) => {
        assert.equal(err.message, `${path.join(baseDir, 'package.json')} should exist`);
        return true;
      });
    });
  });

  it('should get from absolute path', () => {
    const baseDir = getFilepath('framework-egg-default');
    const frameworkPath = path.join(baseDir, 'node_modules/egg');
    const framework = getFrameworkPath({
      baseDir,
      framework: frameworkPath,
    });
    assert.equal(framework, frameworkPath);
  });

  it('should get from absolute path but not exist', () => {
    const baseDir = getFilepath('framework-egg-default');
    const frameworkPath = path.join(baseDir, 'noexist');
    assert.throws(() => {
      getFrameworkPath({
        baseDir,
        framework: frameworkPath,
      });
    }, (err: Error) => {
      assert.equal(err.message, `${frameworkPath} should exist`);
      return true;
    });
  });

  it('should get from npm package', () => {
    const baseDir = getFilepath('framework-egg-default');
    const frameworkPath = path.join(baseDir, 'node_modules/egg');
    const framework = getFrameworkPath({
      baseDir,
      framework: 'egg',
    });
    assert(framework === frameworkPath);
  });

  it('should get from npm package but not exist', () => {
    const baseDir = getFilepath('framework-egg-default');
    assert.throws(() => {
      getFrameworkPath({
        baseDir,
        framework: 'noexist',
      });
    }, (err: Error) => {
      const frameworkPaths = [
        path.join(baseDir, 'node_modules'),
        path.join(process.cwd(), 'node_modules'),
      ].join(',');
      assert.equal(err.message, `noexist is not found in ${frameworkPaths}`);
      return true;
    });
  });

  it('should get from pkg.egg.framework', () => {
    const baseDir = getFilepath('framework-pkg-egg');
    const framework = getFrameworkPath({
      baseDir,
    });
    assert.equal(framework, path.join(baseDir, 'node_modules/yadan'));
  });

  it('should get from pkg.egg.framework but not exist', () => {
    const baseDir = getFilepath('framework-pkg-egg-noexist');
    assert.throws(() => {
      getFrameworkPath({
        baseDir,
      });
    }, (err: Error) => {
      const frameworkPaths = [
        path.join(baseDir, 'node_modules'),
        path.join(process.cwd(), 'node_modules'),
      ].join(',');
      assert.equal(err.message, `noexist is not found in ${frameworkPaths}`);
      return true;
    });
  });

  it('should get egg by default', () => {
    const baseDir = getFilepath('framework-egg-default');
    const framework = getFrameworkPath({
      baseDir,
    });
    assert.equal(framework, path.join(baseDir, 'node_modules/egg'));
  });

  it('should get egg by default but not exist', () => {
    const baseDir = getFilepath('framework-egg-default-noexist');
    assert.throws(() => {
      getFrameworkPath({
        baseDir,
      });
    }, (err: Error) => {
      const frameworkPaths = [
        path.join(baseDir, 'node_modules'),
        path.join(process.cwd(), 'node_modules'),
      ].join(',');
      assert.equal(err.message, `egg is not found in ${frameworkPaths}`);
      return true;
    });
  });

  it('should get egg from process.cwd', () => {
    const cwd = getFilepath('test-app');
    mm(process, 'cwd', () => cwd);
    const baseDir = getFilepath('test-app/test/fixtures/app');

    const framework = getFrameworkPath({
      baseDir,
    });
    assert.equal(framework, path.join(cwd, 'node_modules/egg'));
  });

  it('should get egg from monorepo root dir', () => {
    const cwd = getFilepath('monorepo-app/packages/a');
    mm(process, 'cwd', () => cwd);
    const linkEgg = path.join(testDir, '..', 'node_modules/egg');
    fs.symlinkSync(getFilepath('monorepo-app/node_modules/egg'), linkEgg);
    const framework = getFrameworkPath({
      baseDir: cwd,
    });
    fs.unlinkSync(linkEgg);
    assert.equal(framework, linkEgg);
  });
});
