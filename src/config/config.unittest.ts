import type { EggAppConfig } from '../lib/type.js';

export default () => {
  return {
    logger: {
      consoleLevel: 'WARN',
      buffer: false,
    },
  } satisfies Partial<EggAppConfig>;
}
