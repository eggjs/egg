import path from 'node:path';
import { fileURLToPath } from 'node:url';

// judge if parent is child's parent path
// isEqualOrParentPath('/foo', '/foo/bar') => true
// isEqualOrParentPath('/foo/bar', '/foo') => false
export function isEqualOrParentPath(parent: string, child: string) {
  return !path.relative(parent, child).startsWith('..');
}

export function getSourceDirname() {
  if (typeof __dirname === 'string') {
    return path.dirname(__dirname);
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(path.dirname(__filename));
}
