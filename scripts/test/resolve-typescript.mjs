import { createRequire } from 'node:module';
import path from 'node:path';

// Resolve from the test package, since workspaces can install different compiler versions.
export function resolveTypeScriptCompiler(from) {
  const require = createRequire(from);
  const manifestPath = require.resolve('typescript/package.json');
  const { bin } = require(manifestPath);
  return path.resolve(path.dirname(manifestPath), bin.tsc);
}
