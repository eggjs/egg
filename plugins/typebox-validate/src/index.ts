import './types.ts';

export { Ajv2019 as Ajv } from 'ajv/dist/2019.js';
import { definePluginFactory, type EggPluginFactory } from 'egg';

/**
 * Typebox validate plugin
 *
 * @since 4.1.0
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import typeboxValidatePlugin from '@eggjs/typebox-validate';
 *
 * export default {
 *   ...typeboxValidatePlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'typeboxValidate',
  enable: true,
  path: import.meta.dirname,
}) as EggPluginFactory;
