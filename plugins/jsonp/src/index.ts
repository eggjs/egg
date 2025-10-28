import './types.ts';

import { definePluginFactory, type EggPluginFactory } from 'egg';

/**
 * JSONP plugin
 *
 * @since 4.1.0
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import jsonpPlugin from '@eggjs/jsonp';
 *
 * export default {
 *   ...jsonpPlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'jsonp',
  enable: true,
  path: import.meta.dirname,
  optionalDependencies: ['security'],
}) as EggPluginFactory;
