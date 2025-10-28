import './types.ts';

import { definePluginFactory, type EggPluginFactory } from 'egg';

/**
 * Redis plugin
 *
 * @since 4.1.0
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import redisPlugin from '@eggjs/redis';
 *
 * export default {
 *   ...redisPlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'redis',
  enable: true,
  path: import.meta.dirname,
}) as EggPluginFactory;
