import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import globby from 'globby';
import { describe, it } from 'vitest';

import { RealLoaderFS } from '../src/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test/loader_fs.test.ts', () => {
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
    const yamlPath = path.join(baseDir, 'plain.yml');

    assert.deepEqual(loaderFS.readJSON(packagePath), JSON.parse(fs.readFileSync(packagePath, 'utf8')));
    assert.deepEqual(loaderFS.glob(patterns, { cwd: baseDir }).sort(), globby.sync(patterns, { cwd: baseDir }).sort());
    assert.deepEqual(await loaderFS.loadFile(packagePath), JSON.parse(fs.readFileSync(packagePath, 'utf8')));
    assert.deepEqual(await loaderFS.loadFile(path.join(baseDir, 'object.js')), { a: 1 });
    assert.deepEqual(await loaderFS.loadFile(yamlPath), fs.readFileSync(yamlPath));
  });

  it('should treat a vitest environment-teardown import error as a benign no-op', async () => {
    // A dynamic import() that loses the race with a test-environment teardown
    // throws `EnvironmentTeardownError` ("...after the environment was torn
    // down"). loadFile must swallow it (resolve undefined) so the stray load
    // does not surface as an unhandled rejection that fails an unrelated test.
    const teardownPath = path.join(baseDir, 'teardown-error.js');
    assert.equal(await loaderFS.loadFile(teardownPath), undefined);
  });

  it('should still throw for a genuine load-time failure', async () => {
    const errorPath = path.join(baseDir, 'normal-error.js');
    await assert.rejects(loaderFS.loadFile(errorPath), /\[@eggjs\/loader-fs\] load file:.*boom: real load failure/);
  });
});
