import path from 'node:path';

// judge if parent is child's parent path
// isEqualOrParentPath('/foo', '/foo/bar') => true
// isEqualOrParentPath('/foo/bar', '/foo') => false
export function isEqualOrParentPath(parent: string, child: string) {
  return !path.relative(parent, child).startsWith('..');
}
