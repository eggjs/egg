import path from 'node:path';

import type { IEggPluginItem as EggPluginConfig } from 'egg';

import './config/config.default.ts';
import './app/extend/application.ts';
import './app/extend/agent.ts';
import './app/extend/context.ts';
import './types.ts';

import { Tracer } from './lib/tracer.ts';

export { Tracer };

/**
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import tracerPlugin from '@eggjs/tracer';
 *
 * export default {
 *   ...tracerPlugin(),
 * };
 * ```
 */
export default function tracerPlugin(options?: Pick<EggPluginConfig, 'enable' | 'env'>) {
  return {
    tracer: {
      enable: true,
      path: path.dirname(import.meta.dirname),
      ...options,
    } as EggPluginConfig,
  };
}
