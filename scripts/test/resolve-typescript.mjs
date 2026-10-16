import { fileURLToPath } from 'node:url';

export function resolveTypeScriptCompiler() {
  return fileURLToPath(new URL('../tsrs.js', import.meta.url));
}
