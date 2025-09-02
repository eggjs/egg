import path from 'node:path';
import { mm, type MockClusterOptions } from '@eggjs/mock';

export function cluster(baseDir: string, options: MockClusterOptions = {}) {
  return mm.cluster({
    baseDir: getFilepath(baseDir),
    framework: path.join(import.meta.dirname, '../../egg'),
    cache: false,
    opt: {
      // clear execArgv from egg-bin
      execArgv: [],
    },
    // override @eggjs/mock default port 17001
    ...options,
  });
}

export function getFilepath(name: string) {
  return path.join(import.meta.dirname, 'fixtures', name);
}
