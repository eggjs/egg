import './types.ts';
import { definePluginFactory, type EggPluginFactory } from 'egg';

/**
 * CORS plugin.
 *
 * @since 4.1.0
 */
export default definePluginFactory({
  name: 'cors',
  enable: true,
  path: import.meta.dirname,
  optionalDependencies: ['security'],
}) as EggPluginFactory;
