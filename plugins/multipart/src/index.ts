import './types.ts';

import { definePluginFactory, type EggPluginFactory } from 'egg';

/**
 * Multipart plugin
 *
 * @since 4.1.0
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import multipartPlugin from '@eggjs/multipart';
 *
 * export default {
 *   ...multipartPlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'multipart',
  enable: true,
  path: import.meta.dirname,
  optionalDependencies: ['schedule'],
}) as EggPluginFactory;
