import './types.ts';

import { definePluginFactory, type EggPluginFactory } from 'egg';

/**
 * Security plugin
 *
 * @since 4.1.0
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import securityPlugin from '@eggjs/security';
 *
 * export default {
 *   ...securityPlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'security',
  enable: true,
  path: import.meta.dirname,
  optionalDependencies: ['session'],
}) as EggPluginFactory;
