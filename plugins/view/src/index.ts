import './types.ts';

import { definePluginFactory, type EggPluginFactory } from 'egg';

export default definePluginFactory({
  name: 'view',
  enable: true,
  path: import.meta.dirname,
}) as EggPluginFactory;

export * from './lib/index.ts';
