import './types.ts';
import { definePluginFactory, type EggPluginFactory } from 'egg';

export default definePluginFactory({
  name: 'nunjucks',
  enable: true,
  path: import.meta.dirname,
  dependencies: ['security', 'view'],
}) as EggPluginFactory;

export { NunjucksEnvironment } from './lib/environment.ts';
export { NunjucksFileLoader } from './lib/file_loader.ts';
export { createHelper } from './lib/helper.ts';
export { NunjucksView } from './lib/view.ts';
export { createEngine } from './lib/engine.ts';
export type { NunjucksConfig } from './config/config.default.ts';
