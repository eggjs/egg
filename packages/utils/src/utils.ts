import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function readJSONSync(file: string) {
  if (!existsSync(file)) {
    throw new Error(`${file} is not found`);
  }
  return JSON.parse(readFileSync(file, 'utf-8'));
}

export function getDirname() {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return path.dirname(fileURLToPath(import.meta.url));
}
