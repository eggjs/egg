import './types.ts';
import { definePluginFactory, type EggPluginFactory } from 'egg';

/**
 * I18n plugin
 *
 * @since 4.1.0
 * Usage:
 * ```ts
 * // config/plugin.ts
 * import i18nPlugin from '@eggjs/i18n';
 *
 * export default {
 *   ...i18nPlugin(),
 * };
 * ```
 */
export default definePluginFactory({
  name: 'i18n',
  enable: true,
  path: import.meta.dirname,
}) as EggPluginFactory;
