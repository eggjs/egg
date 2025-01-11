import type { EggAppConfig } from '../lib/types.js';

export default () => {
  return {
    logger: {
      consoleLevel: 'WARN',
      buffer: false,
    },
  } satisfies Partial<EggAppConfig>;
};
