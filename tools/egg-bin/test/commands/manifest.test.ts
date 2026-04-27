import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, it } from 'vitest';

import coffee from '../coffee.js';
import { getRootDirname, getFixtures } from '../helper.js';

describe('test/commands/manifest.test.ts', () => {
  const eggBin = path.join(getRootDirname(), 'bin/run.js');
  const cwd = getFixtures('manifest-skip-close');
  const manifestPath = path.join(cwd, '.egg/manifest.json');
  const beforeCloseMarker = path.join(cwd, 'before-close-called');

  function cleanGeneratedFiles() {
    fs.rmSync(path.dirname(manifestPath), { recursive: true, force: true });
    fs.rmSync(path.join(cwd, 'logs'), { recursive: true, force: true });
    fs.rmSync(path.join(cwd, 'run'), { recursive: true, force: true });
    fs.rmSync(beforeCloseMarker, { force: true });
  }

  beforeEach(cleanGeneratedFiles);
  afterEach(cleanGeneratedFiles);

  it('should not trigger application beforeClose hooks after writing manifest', async () => {
    await coffee.fork(eggBin, ['manifest', 'generate', '--base', cwd, '--env=prod'], { cwd }).expect('code', 0).end();

    assert.ok(fs.existsSync(manifestPath));
    assert.ok(!fs.existsSync(beforeCloseMarker));
  });
});
