import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const nodeRequire = createRequire(import.meta.url);
const esmDirectoryCache = new Map<string, boolean>();

function isEsmFile(filePath: string): boolean {
  if (filePath.endsWith('.mjs')) return true;
  if (filePath.endsWith('.cjs')) return false;

  let directory = path.dirname(filePath);
  const visited: string[] = [];
  while (directory !== path.dirname(directory)) {
    const cached = esmDirectoryCache.get(directory);
    if (cached !== undefined) {
      for (const item of visited) esmDirectoryCache.set(item, cached);
      return cached;
    }

    visited.push(directory);
    const packageFile = path.join(directory, 'package.json');
    if (fs.existsSync(packageFile)) {
      let isEsm = false;
      try {
        isEsm = JSON.parse(fs.readFileSync(packageFile, 'utf8')).type === 'module';
      } catch {
        // Invalid package metadata follows Node's CommonJS-compatible fallback.
      }
      for (const item of visited) esmDirectoryCache.set(item, isEsm);
      return isEsm;
    }
    directory = path.dirname(directory);
  }
  return false;
}

// This setup file runs inside the test ViteVM. CJS files must use Node's
// require cache, while ESM files stay in Vitest's transformed import graph.
globalThis.__EGG_MODULE_IMPORTER__ = async (filePath: string) => {
  if (isEsmFile(filePath)) return import(pathToFileURL(filePath).href);
  return nodeRequire(filePath);
};
