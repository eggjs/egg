import './types.ts';

import { definePluginFactory, type EggPluginFactory } from 'egg';

/**
 * Onerror plugin
 *
 * @since 4.1.0
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import onerrorPlugin from '@eggjs/onerror';
 *
 * export default {
 *   ...onerrorPlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'onerror',
  enable: true,
  path: import.meta.dirname,
  optionalDependencies: ['jsonp'],
}) as EggPluginFactory;
