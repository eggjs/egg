import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mm, MockClusterOptions } from '@eggjs/mock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function cluster(baseDir: string, options: MockClusterOptions = {}) {
  return mm.cluster({
    baseDir,
    framework: path.join(__dirname, 'fixtures/egg'),
    // eggPath: path.join(__dirname, '../node_modules/egg'),
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
  return path.join(__dirname, 'fixtures', name);
}
