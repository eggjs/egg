import path from 'node:path';
import fs from 'node:fs/promises';

import { test, expect } from 'vitest';
import coffee from 'coffee';

test('should tsc build work', async () => {
  const tsc = path.join(import.meta.dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');
  const fixturePath = path.join(import.meta.dirname, 'fixtures/apps/ts-proj');
  const tsconfigPath = path.join(fixturePath, 'tsconfig.json');
  console.log('%s -p %s, cwd: %s', tsc, tsconfigPath, fixturePath);

  await coffee
    .fork(tsc, ['-p', tsconfigPath], {
      cwd: fixturePath,
    })
    .debug()
    .expect('code', 0)
    .end();

  const distStat = await fs.stat(path.join(fixturePath, 'dist'));
  expect(distStat).toBeDefined();
  expect(distStat.isDirectory()).toBe(true);
});
