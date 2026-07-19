import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { StandaloneWorkerBundler } from '@eggjs/egg-bundler/lib/StandaloneWorkerBundler';
import { ServiceWorkerApp } from '@eggjs/service-worker';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(here, 'app');

const manifest = await ServiceWorkerApp.loadMetadata(appDir);
const { outputDir, entry } = await new StandaloneWorkerBundler({
  baseDir: appDir,
  entry: path.join(here, 'worker.ts'),
  format: 'module',
  outputDir: path.join(here, '.worker-cf'),
  manifest,
  excludeModules: ['teggDal'],
  rootPath: path.resolve(here, '../..'),
}).run();
console.log(`✅ bundled -> ${outputDir}/${entry}`);
