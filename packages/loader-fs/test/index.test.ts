import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import globby from 'globby';
import { describe, it } from 'vitest';

import { RealLoaderFS } from '../src/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('test/index.test.ts', () => {
  const loaderFS = new RealLoaderFS();
  const baseDir = path.join(__dirname, 'fixtures/loadfile');

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

    assert.deepEqual(loaderFS.readJSON(packagePath), JSON.parse(fs.readFileSync(packagePath, 'utf8')));
    assert.deepEqual(loaderFS.glob(patterns, { cwd: baseDir }).sort(), globby.sync(patterns, { cwd: baseDir }).sort());
    assert.deepEqual(await loaderFS.loadFile(path.join(baseDir, 'object.js')), { a: 1 });
    const noJsFile = await loaderFS.loadFile(path.join(baseDir, 'no-js.yml'));
    assert.equal(Buffer.isBuffer(noJsFile), true);
    assert.equal((noJsFile as Buffer).toString().replace(/\r\n/g, '\n'), 'foo: bar\n');
  });
});
