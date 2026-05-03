import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { importModule, setBundleModuleLoader } from '../../../src/import.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const seen = [];

setBundleModuleLoader((filepath) => {
  seen.push(filepath);
  return undefined;
});

const result = await importModule(path.resolve(dirname, '../esm'));

if (!seen.some((filepath) => filepath.endsWith('/fixtures/esm'))) {
  throw new Error(`bundle loader miss was not observed: ${JSON.stringify(seen)}`);
}

console.log(result.default.foo);
