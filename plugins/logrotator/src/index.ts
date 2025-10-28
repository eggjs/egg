import './types.ts';

import { definePluginFactory, type EggPluginFactory } from 'egg';

/**
 * LogRotator plugin
 *
 * @since 4.1.0
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import logrotatorPlugin from '@eggjs/logrotator';
 *
 * export default {
 *   ...logrotatorPlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'logrotator',
  enable: true,
  path: import.meta.dirname,
  dependencies: ['schedule'],
}) as EggPluginFactory;

export * from './lib/rotator.ts';
