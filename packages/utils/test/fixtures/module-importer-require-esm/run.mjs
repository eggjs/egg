import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

import { importModule } from '../../../src/import.ts';

// Reproduces the V8 startup-snapshot restore environment, where the deserialized
// main function runs without a host dynamic-import callback. In that environment
// `import()` is unusable, so the snapshot entry installs a synchronous
// `require()`-based `__EGG_MODULE_IMPORTER__` and relies on `importModule()`
// routing through it. This asserts that contract end to end.

const dirname = path.dirname(fileURLToPath(import.meta.url));
const esmPath = path.resolve(dirname, '../esm/index.js');

// 1) Establish the premise: a context with no `importModuleDynamically` callback
//    rejects native `import()` with ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING — the
//    same failure a snapshot-restore main function would hit.
const ctx = vm.createContext({});
await assert.rejects(
  () => vm.runInContext(`import(${JSON.stringify(pathToFileURL(esmPath).href)})`, ctx),
  /dynamic import callback/i,
);

// 2) Install a require-based importer, exactly like the snapshot entry generator
//    does (createRequire over the bundle output dir). require() loads ESM
//    synchronously on Node >= 22, so no dynamic import callback is needed.
const requireFromHere = createRequire(import.meta.url);
let importerCalls = 0;
globalThis.__EGG_MODULE_IMPORTER__ = (filepath) => {
  importerCalls++;
  return requireFromHere(filepath);
};

try {
  const result = await importModule(esmPath);
  // The importer short-circuits before importModule's native `import()` branch,
  // so a single importer call proves the ESM module was loaded via require().
  assert.equal(importerCalls, 1, 'importer must be used instead of native import()');
  assert.equal(result.one, 1);
  assert.equal(result.default.foo, 'bar');
  console.log('IMPORTER_REQUIRE_ESM_OK');
} finally {
  globalThis.__EGG_MODULE_IMPORTER__ = undefined;
}
