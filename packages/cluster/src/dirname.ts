import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function getSrcDirname(): string {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return path.dirname(fileURLToPath(import.meta.url));
}
