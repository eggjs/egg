import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function readJSONSync(file: string): any {
  if (!existsSync(file)) {
    throw new Error(`${file} is not found`);
  }
  return JSON.parse(readFileSync(file, 'utf-8'));
}

export function getDirname(): string {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return path.dirname(fileURLToPath(import.meta.url));
}
