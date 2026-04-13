import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import coffee from 'coffee';
import { test, expect } from 'vitest';

const require = createRequire(import.meta.url);

test('should tsc build work', async () => {
  const tsc = require.resolve('typescript/bin/tsc');
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
