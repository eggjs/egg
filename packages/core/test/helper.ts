import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { EggCore } from '../src/index.js';
import {
  Application,
  type EggCoreInitOptions,
} from './fixtures/egg-esm/index.js';

export { Application } from './fixtures/egg-esm/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getFilepath(name: string) {
  const filepath = path.join(__dirname, 'fixtures', name);
  if (process.platform === 'win32') {
    return filepath.toLowerCase();
  }
  return filepath;
}

export function createApp(
  name: string,
  options?: EggCoreInitOptions & { Application?: typeof EggCore }
): Application {
  const baseDir = getFilepath(name);
  options = options ?? {};
  options.baseDir = baseDir;
  options.type = options.type ?? 'application';

  const CustomApplication = options.Application ?? Application;
  return new CustomApplication(options) as Application;
}

export const symbol = {
  view: Symbol('view'),
};
