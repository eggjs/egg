
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function getSourceDirname() {
  if (typeof __dirname !== 'undefined') {
    return path.dirname(__dirname);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return path.dirname(path.dirname(fileURLToPath(import.meta.url)));
}

export function getSourceFile(filename: string) {
  return path.join(getSourceDirname(), filename);
}
