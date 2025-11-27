import './types.ts';
import { definePluginFactory, type EggPluginFactory } from 'egg';

export default definePluginFactory({
  name: 'watcher',
  enable: true,
  path: import.meta.dirname,
}) as EggPluginFactory;

export * from './lib/watcher.ts';
export * from './lib/event-sources/index.ts';
