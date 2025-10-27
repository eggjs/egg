import { definePluginFactory, type EggDefinePluginFactory } from 'egg';

import './types.ts';

import { Tracer } from './lib/tracer.ts';

export { Tracer };

/**
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import tracerPlugin from '@eggjs/tracer';
 *
 * export default {
 *   ...tracerPlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'tracer',
  enable: true,
  path: import.meta.dirname,
}) as EggDefinePluginFactory;
