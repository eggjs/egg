import './types.ts';

import { definePluginFactory, type EggPluginFactory } from 'egg';

/**
 * Static file serve plugin
 *
 * @since 4.1.0
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import staticPlugin from '@eggjs/static';
 *
 * export default {
 *   ...staticPlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'static',
  enable: true,
  path: import.meta.dirname,
}) as EggPluginFactory;
