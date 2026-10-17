import fs from 'node:fs/promises';
import path from 'node:path';

import coffee from 'coffee';
import { test, expect } from 'vitest';

import { resolveTypeScriptCompiler } from '../../../scripts/test/resolve-typescript.mjs';

test('should tsrs build work', async () => {
  const compiler = resolveTypeScriptCompiler();
  const fixturePath = path.join(import.meta.dirname, 'fixtures/apps/ts-proj');
  const tsconfigPath = path.join(fixturePath, 'tsconfig.json');
  console.log('%s -p %s, cwd: %s', compiler, tsconfigPath, fixturePath);

  await coffee
    .fork(compiler, ['-p', tsconfigPath], {
      cwd: fixturePath,
    })
    .debug()
    .expect('code', 0)
    .end();

  const distStat = await fs.stat(path.join(fixturePath, 'dist'));
  expect(distStat).toBeDefined();
  expect(distStat.isDirectory()).toBe(true);
});
