import './types.ts';
import { definePluginFactory, type EggPluginFactory } from 'egg';

/**
 * CORS plugin
 *
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import corsPlugin from '@eggjs/cors';
 *
 * export default {
 *   ...corsPlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'cors',
  enable: true,
  path: import.meta.dirname,
  optionalDependencies: ['security'],
}) as EggPluginFactory;
