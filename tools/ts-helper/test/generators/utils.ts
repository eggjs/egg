import path from 'node:path';
import { GeneratorResult } from '../../dist/';
import assert from 'node:assert';
import { createTsHelper } from '../utils';

export function triggerGenerator<T extends GeneratorResult[] | GeneratorResult = GeneratorResult[]>(
  name: string,
  appDir: string,
  file?: string,
  extra?: any,
) {
  const tsHelper = createTsHelper({
    cwd: appDir,
    watch: false,
    execAtInit: false,
  });

  const watcher = tsHelper.watcherList.find(w => w.name === name)!;
  assert(watcher, 'watcher is not exist');
  const dir = path.resolve(appDir, watcher.options.directory);
  watcher.init({
    ...watcher.options,
    ...extra,
  });

  return watcher.execute(file ? path.resolve(dir, file) : '') as any as T;
}
