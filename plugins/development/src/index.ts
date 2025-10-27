import { definePluginFactory, type EggDefinePluginFactory } from 'egg';

import './types.ts';

/**
 * Local development plugin, only enabled in `local` environment.
 *
 * @since 4.1.0
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import developmentPlugin from '@eggjs/development';
 *
 * export default {
 *   ...developmentPlugin(),
 * };
 * ```
 *
 * @param options - Plugin options
 * @param options.enable - `true` by default. on CI, it's `false` to avoid unexpected errors.
 * @param options.env - Environment list to enable the plugin, default is `['local']`.
 * @returns Plugin config
 */
export default definePluginFactory({
  name: 'development',
  enable: true,
  path: import.meta.dirname,
  env: ['local'],
  dependencies: ['watcher'],
}) as EggDefinePluginFactory;
