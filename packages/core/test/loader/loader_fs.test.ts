import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { RealLoaderFS } from '@eggjs/loader-fs';
import globby from 'globby';
import { describe, it } from 'vitest';

import utils from '../../src/utils/index.ts';
import { getFilepath } from '../helper.ts';

describe('test/loader/loader_fs.test.ts', () => {
  const loaderFS = new RealLoaderFS();
  const baseDir = getFilepath('loadfile');

  it('should wrap exists/stat/realpath with node fs behavior', () => {
    const filepath = path.join(baseDir, 'object.js');

    assert.equal(loaderFS.exists(filepath), fs.existsSync(filepath));
    assert.equal(loaderFS.exists(path.join(baseDir, 'not-exists.js')), false);
    assert.equal(loaderFS.stat(filepath).isFile(), fs.statSync(filepath).isFile());
    assert.equal(loaderFS.realpath(baseDir), fs.realpathSync(baseDir));
  });

  it('should wrap readJSON/glob/loadFile with current loader behavior', async () => {
    const packagePath = path.join(baseDir, 'package.json');
    const patterns = ['*.js', '!null.js'];

    assert.deepEqual(await loaderFS.readJSON(packagePath), JSON.parse(fs.readFileSync(packagePath, 'utf8')));
    assert.deepEqual(loaderFS.glob(patterns, { cwd: baseDir }).sort(), globby.sync(patterns, { cwd: baseDir }).sort());
    assert.deepEqual(
      await loaderFS.loadFile(path.join(baseDir, 'object.js')),
      await utils.loadFile(path.join(baseDir, 'object.js')),
    );
  });
});
