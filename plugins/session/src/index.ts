import './types.ts';

import { definePluginFactory, type EggPluginFactory } from 'egg';

export * from './config/config.default.ts';

export default definePluginFactory({
  name: 'session',
  enable: true,
  path: import.meta.dirname,
}) as EggPluginFactory;
