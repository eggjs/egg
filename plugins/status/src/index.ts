import { definePluginFactory, type EggPluginFactory } from 'egg';

import './types.ts';

export type { StatusConfig } from './config/config.default.ts';

/**
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import statusPlugin from '@eggjs/status';
 *
 * export default {
 *   ...statusPlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'status',
  enable: true,
  path: import.meta.dirname,
}) as EggPluginFactory;
